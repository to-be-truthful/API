import {IHelper} from "./IHelper";
import {RateModel} from "../database/Rate";

export class RemovalHelper implements IHelper{
    constructor(){
        setInterval(this.run, 60 * 60 * 1000)
    }

    run = () => {
        const currentDate = new Date();
        const deletionDate = new Date(currentDate.setDate(currentDate.getDate() - 1));

        console.log(deletionDate);
        RateModel.remove({
            date: {
                $lt: deletionDate
            }
        });
    }
}